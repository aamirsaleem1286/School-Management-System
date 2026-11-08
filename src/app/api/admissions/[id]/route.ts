import { crudItem } from "@/lib/crud";
import { admissionResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(admissionResource);
