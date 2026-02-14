import { Request, Response } from 'express';
import aidboxClient from '../config/aidbox';

export const PatientController = {
    async getCareTeam(req: Request, res: Response) {
        try {
            const user = req.user!;
            if (user.role !== 'patient') {
                return res.status(403).json({ error: "Only patients can view their own CareTeam" });
            }

            const patientId = user.fhirResourceId;

            const response = await aidboxClient.get('/CareTeam', {
                params: {
                    subject: `Patient/${patientId}`,
                    status: 'active',
                    _include: 'CareTeam:participant'
                }
            });

            const entries = response.data.entry || [];

            // Separate CareTeams from included resources
            const careTeams = entries
                .filter((e: { resource: Record<string, unknown> }) => e.resource.resourceType === 'CareTeam')
                .map((e: { resource: Record<string, unknown> }) => e.resource);

            // Build a lookup map for included resources
            const resourceMap: Record<string, Record<string, unknown>> = {};
            entries.forEach((e: { resource: Record<string, unknown> }) => {
                const r = e.resource;
                if (r.resourceType !== 'CareTeam') {
                    resourceMap[`${r.resourceType}/${r.id}`] = r;
                }
            });

            // Enrich CareTeam participants with resolved display names
            const enrichedTeams = careTeams.map((ct: Record<string, unknown>) => {
                const participants = (ct.participant as Array<Record<string, unknown>> || []).map((p: Record<string, unknown>) => {
                    const member = p.member as Record<string, unknown> | undefined;
                    if (member?.reference) {
                        const ref = member.reference as string;
                        const resolved = resourceMap[ref];
                        if (resolved && (resolved as Record<string, unknown>).name) {
                            const nameArr = (resolved as Record<string, unknown>).name as Array<Record<string, unknown>>;
                            if (Array.isArray(nameArr) && nameArr[0]) {
                                const given = (nameArr[0].given as string[])?.join(' ') || '';
                                const family = (nameArr[0].family as string) || '';
                                member.display = `${given} ${family}`.trim();
                            }
                        }
                    }
                    return p;
                });
                return { ...ct, participant: participants };
            });

            res.json(enrichedTeams);

        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            console.error("Get CareTeam Error:", msg);
            res.status(500).json({ error: "Failed to fetch CareTeam" });
        }
    }
};
