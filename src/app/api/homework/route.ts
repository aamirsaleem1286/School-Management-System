import { crudCollection } from "@/lib/crud";
import { homeworkResource } from "@/lib/resources";

export const { GET, POST } = crudCollection(homeworkResource);
