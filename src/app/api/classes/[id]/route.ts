import { crudItem } from "@/lib/crud";
import { classResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(classResource);
