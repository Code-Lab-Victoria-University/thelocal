import { SkillBuilders } from "ask-sdk-core";

import { LaunchRequestHandler } from "./handlers/LaunchRequestHandler";
import { SessionEndedRequestHandler } from "./handlers/SessionEndedRequestHandler";
import { CustomErrorHandler } from "./handlers/CustomErrorHandler";
import {SetLocationHandler} from "./handlers/SetLocationHandler"

import {IntentHandler} from './handlers/IntentHandler'

import { DynamoDbPersistenceAdapter } from 'ask-sdk-dynamodb-persistence-adapter';

const Persistence = new DynamoDbPersistenceAdapter({
  tableName: "thelocal"
})

const skillBuilder = SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    new LaunchRequestHandler(),
    new SetLocationHandler(),
    new IntentHandler("VenueIntent", input => {
      if(input.slots)
        return "You said" + input.slots["Venue"].value
      else
        return "No venue supplied"
    }),
    new IntentHandler("AMAZON.HelpIntent", 'You can say hello to me!'),
    new IntentHandler(['AMAZON.CancelIntent', 'AMAZON.StopIntent'], 'Goodbye!'),
    new SessionEndedRequestHandler()
  )
  .addErrorHandlers(new CustomErrorHandler)
  .withPersistenceAdapter(Persistence)
  .lambda();