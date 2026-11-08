import { crudItem } from "@/lib/crud";
import { employeeResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(employeeResource);
