import { createContext, useContext } from "react";
import type { Role } from "@/lib/permissions";

// Rol de la sesión activa. Sin proveedor se asume el de menos permisos.
export const RoleContext = createContext<Role>("cashier");

export const useRole = () => useContext(RoleContext);
