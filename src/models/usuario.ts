export type Rol = "empleador" | "trabajador";

export interface UsuarioPublico {
  id: number;
  nombre: string;
  correo: string;
  rol: Rol;
  verificado: boolean;
}

export interface UsuarioConHash extends UsuarioPublico {
  passwordHash: string;
}

// El usuario que hizo la petición (sale del token)
export interface UsuarioActual {
  id: number;
  rol: Rol;
}
