"""
Liveness Detection Service — Stage 2.

Uses Silent-Face-Anti-Spoofing (SFAS) model to classify a selfie as
live face or spoof (print attack / replay attack / 3D mask).

Why a dedicated liveness check before face verification?
  - Face verification models compare textures; they CAN be fooled by
    high-quality printed photos held up to the camera.
  - Running liveness FIRST short-circuits the pipeline early —
    no expensive embedding comparison if the selfie is a spoof.

Confidence interpretation:
  score >= liveness_min_confidence → live
  score <  liveness_min_confidence → rejected (spoof or inconclusive)

The model outputs a probability in [0, 1] where 1.0 = definitely live.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from app.core.exceptions import ImageQualityTooLow, SpoofingDetected
from app.core.security import get_logger

logger = get_logger(__name__)

MODEL_PATH = Path(os.environ.get(
    "SFAS_MODEL_PATH",
    "models/silent_face/2.7_80x80_MiniFASNetV2.pth",
))


@dataclass
class LivenessOutput:
    passed: bool
    liveness_score: float
    is_live: bool
    spoof_type: str | None = None
    model_version: str = "MiniFASNetV2"
    failure_reason: str | None = None


class LivenessService:
    """
    Wraps Silent-Face-Anti-Spoofing inference.
    Model is loaded once (lazy) and reused across requests.
    """

    def __init__(self, min_confidence: float = 0.80) -> None:
        self._min_confidence = min_confidence
        self._model: Any = None

    async def check(self, selfie_bytes: bytes) -> LivenessOutput:
        logger.info("liveness.start")
        img = self._decode(selfie_bytes)
        face_img = self._detect_and_crop_face(img)

        score = self._infer(face_img)
        is_live = score >= self._min_confidence

        logger.info("liveness.result", score=score, is_live=is_live)

        if not is_live:
            spoof_type = self._classify_spoof(face_img)
            return LivenessOutput(
                passed=False,
                liveness_score=score,
                is_live=False,
                spoof_type=spoof_type,
                failure_reason=f"Liveness score {score:.3f} below threshold {self._min_confidence}",
            )

        return LivenessOutput(
            passed=True,
            liveness_score=score,
            is_live=True,
        )

    # ── Internal ──────────────────────────────────────────────────────────────

    def _get_model(self) -> Any:
        """
        Lazy-load the SFAS model.
        In production this would load a TorchScript / ONNX export so we
        don't need the full training codebase at runtime.
        """
        if self._model is None:
            try:
                # Production path: load ONNX via onnxruntime
                import onnxruntime as ort  # type: ignore[import-untyped]
                onnx_path = str(MODEL_PATH).replace(".pth", ".onnx")
                self._model = ort.InferenceSession(
                    onnx_path,
                    providers=["CPUExecutionProvider"],
                )
                logger.info("liveness.model_loaded", path=onnx_path, backend="onnxruntime")
            except Exception:
                # Dev fallback: simulate with OpenCV face detection quality heuristic
                logger.warning("liveness.model_unavailable", fallback="heuristic")
                self._model = "heuristic"
        return self._model

    def _infer(self, face_img: np.ndarray) -> float:
        model = self._get_model()

        if model == "heuristic":
            return self._heuristic_liveness(face_img)

        # ONNX inference
        input_name = model.get_inputs()[0].name
        h, w = 80, 80
        resized = cv2.resize(face_img, (w, h)).astype(np.float32)
        resized = (resized - 127.5) / 128.0
        blob = np.transpose(resized, (2, 0, 1))[np.newaxis, ...]  # NCHW
        outputs = model.run(None, {input_name: blob})
        # outputs[0] shape: (1, 2) — [spoof_prob, live_prob]
        live_prob = float(outputs[0][0][1])
        return live_prob

    @staticmethod
    def _heuristic_liveness(face_img: np.ndarray) -> float:
        """
        Development heuristic when SFAS model is unavailable.
        Estimates liveness from image sharpness (Laplacian variance) and
        colour distribution naturalness.  NOT production-safe.
        """
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        # Normalise sharpness: well-focused live face ≈ 100-500
        score = float(min(sharpness / 300.0, 1.0))
        return score

    @staticmethod
    def _detect_and_crop_face(img: np.ndarray) -> np.ndarray:
        """
        Use OpenCV Haar cascade for face detection + crop.
        In production replace with MTCNN or RetinaFace for robustness.
        """
        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))

        if len(faces) == 0:
            # Fall back to full image resize — liveness still useful even without tight crop
            logger.warning("liveness.no_face_detected_using_full_image")
            return cv2.resize(img, (160, 160))

        # Use largest face
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        margin = 20
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(img.shape[1], x + w + margin)
        y2 = min(img.shape[0], y + h + margin)
        return img[y1:y2, x1:x2]

    @staticmethod
    def _classify_spoof(face_img: np.ndarray) -> str:
        """
        Heuristic spoof type classification.
        A production system uses a separate classifier trained on
        print vs replay vs 3D-mask datasets.
        """
        # Moire pattern detection (characteristic of printed photos)
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude = np.abs(fshift)
        h, w = magnitude.shape
        # Suppress DC component and check high-frequency energy
        magnitude[h // 2 - 5:h // 2 + 5, w // 2 - 5:w // 2 + 5] = 0
        high_freq_energy = magnitude[h // 4:3 * h // 4, w // 4:3 * w // 4].mean()

        if high_freq_energy > 5000:
            return "print_attack"
        return "replay_attack"

    @staticmethod
    def _decode(data: bytes) -> np.ndarray:
        arr = np.frombuffer(data, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ImageQualityTooLow("Cannot decode selfie image")
        return img
