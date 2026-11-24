import { CrearOfertaDto, FiltrosOfertasDto } from "../dtos/oferta.dto";
import { BadRequestError, NotFoundError } from "../errors/app-error";
import { Db } from "../repositories/interfaces";

export class OfertaService {
  constructor(private readonly db: Db) {}

  async crear(empleadorId: number, dto: CrearOfertaDto) {
    if (Date.parse(dto.fecha) <= Date.now()) {
      throw new BadRequestError("La fecha de la oferta debe ser futura");
    }
    return this.db.repos.ofertas.crear(empleadorId, dto);
  }

  async listar(filtros: FiltrosOfertasDto) {
    const { data, total } = await this.db.repos.ofertas.listar(filtros);
    return {
      data,
      page: filtros.page,
      limit: filtros.limit,
      total,
      ...(total === 0 && {
        sugerencia: "No hay resultados. Amplía el rango de búsqueda (fecha, ubicación o tipo).",
      }),
    };
  }

  async listarDelEmpleador(empleadorId: number) {
    return { data: await this.db.repos.ofertas.listarPorEmpleador(empleadorId) };
  }

  async obtener(id: number) {
    const oferta = await this.db.repos.ofertas.porId(id);
    if (!oferta) throw new NotFoundError("Oferta no encontrada");
    return oferta;
  }
}
