import { crudCollection } from "@/lib/crud";
import { vehicleResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(vehicleResource);
