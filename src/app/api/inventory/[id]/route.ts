import { crudItem } from "@/lib/crud";
import { inventoryResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(inventoryResource);
