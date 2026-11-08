import { crudItem } from "@/lib/crud";
import { examResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(examResource);
