import { z } from "zod";

export const CreateEventSchema = z.object({
  title: z.string().min(1).max(200),
  ticketPrice: z.number().min(0),
  eventDate: z.string().datetime(),
  posterUrl: z.string().optional(),
});

export const BuyTicketSchema = z.object({}).optional();

export const ScanTicketSchema = z.object({
  checkInHash: z.string().min(1),
});
