import { prisma } from "./prisma-vaccine-record.repo";
import type { ClinicRepo } from "./clinic.repository";

export const prismaClinicRepo: ClinicRepo = {
  async listInBox({ minLat, maxLat, minLng, maxLng }) {
    const rows = await prisma.clinic.findMany({
      where: {
        latitude: { gte: minLat, lte: maxLat },
        longitude: { gte: minLng, lte: maxLng },
      },
    });
    return rows.map((c: any) => ({
      id: c.id,
      nome: c.nome,
      endereco: c.endereco,
      cidade: c.cidade,
      uf: c.uf,
      telefone: c.telefone,
      latitude: c.latitude,
      longitude: c.longitude,
    }));
  },
};
