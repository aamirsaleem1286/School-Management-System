import { crudItem } from "@/lib/crud";
import { payrollResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(payrollResource);
