import { crudItem } from "@/lib/crud";
import { homeworkResource } from "@/lib/resources";

export const { GET, PATCH, DELETE } = crudItem(homeworkResource);
