import { crudItem } from "@/lib/crud";
import { feeStructureResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(feeStructureResource);
