import { crudItem } from "@/lib/crud";
import { vehicleResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(vehicleResource);
