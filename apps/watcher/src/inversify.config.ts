import "reflect-metadata";
import { applicationModule } from "@bivium/application";
import { portsModule, repositoryModule } from "@bivium/infrastructure";
import { Container } from "inversify";
import { configBindings } from "./container/config/configBinding.js";
import { controllerBindings } from "./container/controller/controllerBinding.js";

const container = new Container();

container.load(
	configBindings,
	repositoryModule,
	portsModule,
	applicationModule,
	controllerBindings,
);

export { container };
