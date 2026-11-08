import { crudItem } from "@/lib/crud";
import { transportRouteResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(transportRouteResource);
