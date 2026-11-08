import { crudCollection } from "@/lib/crud";
import { employeeResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(employeeResource);
