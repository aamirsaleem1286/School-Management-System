import { crudCollection } from "@/lib/crud";
import { invoiceResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(invoiceResource);
