import * as restate from "@restatedev/restate-sdk";
import aidboxClient from "../config/aidbox";
import { v4 as uuidv4 } from "uuid";

export const appointmentService = restate.service({
    name: "appointment",
    handlers: {
        bookAppointment: async (ctx, event: { slotId: string, patientId: string, reason: string }) => {
            const { slotId, patientId, reason } = event;

            // We want to lock on slotId to prevent double booking.
            // Restate services are keyed by default if we use 'object' but here 'service' is stateless.
            // However, we can use a Virtual Object keyed by SlotId if we want strict serialization.
            // Or we just trust the transaction.
            // But Restate "service" handlers run sequentially for the same key IF it's a Virtual Object.
            // For a 'service', it's concurrent.
            // Requirement: "Ensure idempotent workflows".

            // Let's use the Aidbox Transaction to ensure atomicity, which we did in the controller.
            // But moving to Restate allows us to add side effects (notifications) reliably.

            const ctxLog = ctx.console;
            ctxLog.info(`Booking appointment for slot ${slotId}`);

            return await ctx.run("executeBooking", async () => {
                // 1. Check Slot Status
                const slotRes = await aidboxClient.get(`/Slot/${slotId}`);
                const slot = slotRes.data;
                if (slot.status !== 'free') {
                    throw new restate.TerminalError("Slot is not free");
                }

                // 2. Prepare Resources
                const appointmentId = uuidv4();
                const appointment = {
                    resourceType: "Appointment",
                    id: appointmentId,
                    status: "booked",
                    start: slot.start,
                    end: slot.end,
                    slot: [{ reference: `Slot/${slotId}` }],
                    participant: [
                        { actor: { reference: `Patient/${patientId}` }, status: "accepted" },
                        // We should really fetch the practitioner from the schedule, but let's assume schedule has one actor.
                    ],
                    reasonCode: [{ text: reason }]
                };

                // Fetch schedule to add practitioner
                try {
                    const scheduleRes = await aidboxClient.get(`/${slot.schedule.reference}`);
                    const schedule = scheduleRes.data;
                    if (schedule.actor && schedule.actor.length > 0) {
                        appointment.participant.push({ actor: schedule.actor[0], status: "accepted" });
                    }
                } catch (e) {
                    ctxLog.warn("Could not fetch schedule details");
                }

                // 3. Execute Transaction
                await aidboxClient.post('/', {
                    resourceType: "Bundle",
                    type: "transaction",
                    entry: [
                        {
                            resource: appointment,
                            request: { method: "PUT", url: `/Appointment/${appointmentId}` }
                        },
                        {
                            resource: { ...slot, status: "busy" },
                            request: { method: "PUT", url: `/Slot/${slotId}` }
                        }
                    ]
                });

                return { appointmentId, status: "booked" };
            });
        }
    }
});
