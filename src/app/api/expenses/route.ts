import { crudCollection } from "@/lib/crud";
import { expenseResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(expenseResource);
