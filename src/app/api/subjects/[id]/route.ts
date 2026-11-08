import { crudItem } from "@/lib/crud";
import { subjectResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(subjectResource);
