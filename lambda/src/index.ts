import { SkillBuilders } from "ask-sdk-core";

import { LaunchRequestHandler } from "./handlers/LaunchRequestHandler";
import { SessionEndedRequestHandler } from "./handlers/SessionEndedRequestHandler";
import { CustomErrorHandler } from "./handlers/CustomErrorHandler";

import {IntentHandler} from './IntentHandler'

const skillBuilder = SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    new LaunchRequestHandler(),
    new IntentHandler("SetLocationIntent", req => {
			let location = req.intent.slots["Location"].value

			return `Do you want your location to be ${location}`
		}),
    new IntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'),
    new IntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 'Goodbye!'),
    new SessionEndedRequestHandler()
  )
  .addErrorHandlers(new CustomErrorHandler)
  .lambda();