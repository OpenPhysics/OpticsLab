import { RayTracingCommonModel } from "../common/model/RayTracingCommonModel.js";
import OpticsLabNamespace from "../OpticsLabNamespace.js";

export class LabModel extends RayTracingCommonModel {}

OpticsLabNamespace.register("LabModel", LabModel);
