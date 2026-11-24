import { ForbiddenError, NotFoundError } from "../errors/app-error";
import { Repos } from "../repositories/interfaces";
import { UsuarioActual } from "../models/usuario";

// Carga una postulación con su oferta y dice si el usuario es el empleador o el trabajador de esa postulación.
// Bloquea la oferta para que dos confirmaciones o calificaciones simultáneas no se pisen.
export async function cargarParticipacion(r: Repos, postulacionId: number, usuario: UsuarioActual) {
  const previa = await r.postulaciones.porId(postulacionId);
  if (!previa) throw new NotFoundError("Postulación no encontrada");

  const oferta = await r.ofertas.bloquear(previa.ofertaId);
  if (!oferta) throw new NotFoundError("Oferta no encontrada");

  const postulacion = await r.postulaciones.porId(postulacionId); // se lee de nuevo con el bloqueo ya tomado
  if (!postulacion) throw new NotFoundError("Postulación no encontrada");

  let parte: "empleador" | "trabajador";
  if (usuario.id === oferta.empleadorId) parte = "empleador";
  else if (usuario.id === postulacion.trabajadorId) parte = "trabajador";
  else throw new ForbiddenError("No participas en esta postulación");

  return { postulacion, oferta, parte };
}
