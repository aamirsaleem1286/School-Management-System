import { crudItem } from "@/lib/crud";
import { studentResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(studentResource);
