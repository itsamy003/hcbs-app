import * as restate from "@restatedev/restate-sdk";
import { guardianService } from "./services/guardianService";
import { appointmentService } from "./services/appointmentService";
import { config } from "./config/env";

const app = restate.endpoint();

app.bind(guardianService);
app.bind(appointmentService);

app.listen(Number(config.port));

console.log(`Restate service listening on port ${config.port}`);
