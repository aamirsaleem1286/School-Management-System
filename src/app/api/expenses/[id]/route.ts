import { crudItem } from "@/lib/crud";
import { expenseResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(expenseResource);
