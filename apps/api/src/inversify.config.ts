import "reflect-metadata";
import { applicationModule } from "@bivium/application";
import { repositoryModule, serviceModule } from "@bivium/infrastructure";
import { Container } from "inversify";
import { configBindings } from "./container/config/configBinding.js";
import { controllerBindings } from "./container/controller/controllerBinding.js";

const container = new Container();

container.load(
	configBindings,
	repositoryModule,
	serviceModule,
	applicationModule,
	controllerBindings,
);

export { container };
