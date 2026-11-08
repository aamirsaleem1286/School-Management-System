import { crudItem } from "@/lib/crud";
import { invoiceResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(invoiceResource);
