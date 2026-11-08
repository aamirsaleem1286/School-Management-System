import { crudCollection } from "@/lib/crud";
import { transportRouteResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(transportRouteResource);
