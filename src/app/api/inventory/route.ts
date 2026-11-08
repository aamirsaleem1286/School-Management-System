import { crudCollection } from "@/lib/crud";
import { inventoryResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(inventoryResource);
