import { crudItem } from "@/lib/crud";
import { libraryTransactionResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(libraryTransactionResource);
