import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addSponsoredPost } from '../utils/promotionState';
import { createPost } from '../utils/api';
import { uploadFile } from '../utils/imagekit';

export default function CreatePost() {
  const navigate = useNavigate();
  const [postText, setPostText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [enablePromotion, setEnablePromotion] = useState(false);
  const [promotionBudget, setPromotionBudget] = useState(500);
  const [promotionAudience, setPromotionAudience] = useState('All professionals');
  const [promotionTargetType, setPromotionTargetType] = useState('post');
  const [promotionTargetId, setPromotionTargetId] = useState('');
  const [promotionStartDate, setPromotionStartDate] = useState('');
  const [promotionEndDate, setPromotionEndDate] = useState('');
  const [selectedTag, setSelectedTag] = useState('Update');

  const previewImages = useMemo(
    () => selectedImages.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    })),
    [selectedImages],
  );

  useEffect(() => () => {
    previewImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
  }, [previewImages]);

  function handleImageSelect(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) {
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    setSelectedImages((prev) => [...prev, ...imageFiles]);
    event.target.value = '';
  }

  function handleRemoveImage(indexToRemove) {
    setSelectedImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  }

  function handleClearImages() {
    setSelectedImages([]);
  }

  async function handlePublishPost() {
    if (!postText.trim()) {
      return;
    }

    try {
      const attachments = [];
      for (const file of selectedImages) {
        const result = await uploadFile(file, `post-${Date.now()}`, ['post-attachment']);
        attachments.push(result.url);
      }

      const createdPost = await createPost({
        content: postText.trim(),
        attachments,
        imagesCount: attachments.length,
        tag: selectedTag,
      });

    if (enablePromotion && postText.trim()) {
      addSponsoredPost({
        content: postText.trim(),
        imageCount: selectedImages.length,
        audience: promotionAudience,
        budget: Number(promotionBudget) || 500,
        targetType: promotionTargetType,
        targetId: promotionTargetId || createdPost.id,
        startDate: promotionStartDate,
        endDate: promotionEndDate,
      });

      navigate('/smart-promotion');
      return;
    }

    } catch (err) {
      console.error("Failed to publish post", err);
    }

    navigate('/home');
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] px-6 py-8 lg:px-10">
      <div className="mx-auto w-full max-w-[980px] rounded-[28px] border border-[rgba(91,97,110,0.18)] bg-white p-6 shadow-[0_8px_24px_rgba(10,11,13,0.05)] lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5b616e]">Create Post</p>
        <h1 className="mt-2 text-[36px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#0a0b0d]">Share an update with verified people</h1>
        <p className="mt-3 max-w-[760px] text-[16px] leading-[1.6] text-[#5b616e]">Keep it useful: hiring, collaboration, learning, milestones, or trusted business updates.</p>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
            >
              <option value="Update">Update</option>
              <option value="Hiring">Hiring</option>
              <option value="Collab">Collab</option>
              <option value="Partnership">Partnership</option>
            </select>
            <div className="rounded-full border border-[rgba(91,97,110,0.18)] bg-[#f8f9fc] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#5b616e]">
              Images attached: {selectedImages.length}
            </div>
          </div>

          <textarea
            rows="7"
            placeholder="Write your post here..."
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            className="w-full resize-none rounded-[22px] border border-[rgba(91,97,110,0.25)] px-4 py-4 text-sm outline-none focus:border-[#0052ff]"
          />

          <div className="rounded-[22px] border border-[rgba(91,97,110,0.25)] bg-[#f8f9fc] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0a0b0d]">Upload images</p>
                <p className="text-xs text-[#5b616e]">PNG, JPG, WEBP supported. You can select multiple images.</p>
              </div>

              {selectedImages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearImages}
                  className="rounded-full border border-[rgba(91,97,110,0.25)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
                >
                  Clear all
                </button>
              )}
            </div>

            <label className="mt-4 inline-flex cursor-pointer items-center rounded-full bg-[#0052ff] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]">
              Choose images
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>

            {previewImages.length > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {previewImages.map(({ file, previewUrl }, index) => (
                  <article key={`${file.name}-${index}`} className="overflow-hidden rounded-[16px] border border-[rgba(91,97,110,0.18)] bg-white">
                    <img src={previewUrl} alt={file.name} className="h-36 w-full object-cover" />
                    <div className="flex items-center justify-between gap-2 p-3">
                      <p className="truncate text-xs font-semibold text-[#0a0b0d]" title={file.name}>{file.name}</p>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="rounded-full border border-[rgba(91,97,110,0.25)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]"
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[22px] border border-[rgba(91,97,110,0.25)] bg-[#f8f9fc] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0a0b0d]">Smart promotion</p>
                <p className="text-xs text-[#5b616e]">Promote this post as a sponsored ad and increase reach.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#0a0b0d]">
                <input
                  type="checkbox"
                  checked={enablePromotion}
                  onChange={(e) => setEnablePromotion(e.target.checked)}
                  className="h-4 w-4 accent-[#0052ff]"
                />
                Enable
              </label>
            </div>

            {enablePromotion && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="promotionTargetType" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Target type</label>
                  <select
                    id="promotionTargetType"
                    value={promotionTargetType}
                    onChange={(e) => setPromotionTargetType(e.target.value)}
                    className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
                  >
                    <option value="post">Post</option>
                    <option value="profile">Profile</option>
                    <option value="business">Business</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="promotionTargetId" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Target ID</label>
                  <input
                    id="promotionTargetId"
                    type="text"
                    value={promotionTargetId}
                    onChange={(e) => setPromotionTargetId(e.target.value)}
                    placeholder="post or profile identifier"
                    className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="promotionBudget" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Budget (Rs)</label>
                  <input
                    id="promotionBudget"
                    type="number"
                    min="100"
                    value={promotionBudget}
                    onChange={(e) => setPromotionBudget(e.target.value)}
                    className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="promotionAudience" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Target audience</label>
                  <select
                    id="promotionAudience"
                    value={promotionAudience}
                    onChange={(e) => setPromotionAudience(e.target.value)}
                    className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
                  >
                    <option>All professionals</option>
                    <option>Verified businesses</option>
                    <option>Hiring managers</option>
                    <option>Founders and startups</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="promotionStartDate" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">Start date</label>
                  <input
                    id="promotionStartDate"
                    type="date"
                    value={promotionStartDate}
                    onChange={(e) => setPromotionStartDate(e.target.value)}
                    className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="promotionEndDate" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#5b616e]">End date</label>
                  <input
                    id="promotionEndDate"
                    type="date"
                    value={promotionEndDate}
                    onChange={(e) => setPromotionEndDate(e.target.value)}
                    className="w-full rounded-full border border-[rgba(91,97,110,0.25)] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#0052ff]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handlePublishPost} className="rounded-full bg-[#0052ff] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0046d8]">{enablePromotion ? 'Promote and publish' : 'Post now'}</button>
            <button type="button" onClick={() => navigate('/home')} className="rounded-full border border-[rgba(91,97,110,0.25)] px-6 py-3 text-sm font-semibold text-[#0a0b0d] transition-colors hover:border-[#0052ff] hover:text-[#0052ff]">Back to feed</button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] bg-[#eef0f3] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Post type</p>
            <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Opportunity, update, or insight</p>
          </div>
          <div className="rounded-[20px] bg-[#eef0f3] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Audience</p>
            <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Verified professionals and businesses</p>
          </div>
          <div className="rounded-[20px] bg-[#eef0f3] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#5b616e]">Punch line</p>
            <p className="mt-2 text-sm font-semibold text-[#0a0b0d]">Post with trust, not noise.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
