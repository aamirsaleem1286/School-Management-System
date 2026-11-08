import { crudCollection } from "@/lib/crud";
import { admissionResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(admissionResource);
