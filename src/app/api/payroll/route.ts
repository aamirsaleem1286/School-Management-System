import { crudCollection } from "@/lib/crud";
import { payrollResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(payrollResource);
