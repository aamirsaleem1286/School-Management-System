import { crudCollection } from "@/lib/crud";
import { libraryTransactionResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(libraryTransactionResource);
