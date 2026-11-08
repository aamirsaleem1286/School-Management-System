import { crudCollection } from "@/lib/crud";
import { bookResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(bookResource);
