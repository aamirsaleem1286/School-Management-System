import { crudCollection } from "@/lib/crud";
import { feeStructureResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(feeStructureResource);
