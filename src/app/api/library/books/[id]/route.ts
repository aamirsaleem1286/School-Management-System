import { crudItem } from "@/lib/crud";
import { bookResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(bookResource);
