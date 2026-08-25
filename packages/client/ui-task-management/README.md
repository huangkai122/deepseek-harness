# @deepseek-ai/dsh-client-ui-task-management

The modal first requires an explicit workspace selection. It can register a new workspace by opening the local directory picker and associating the selected canonical path. New tasks use one description field; screenshots and attachments are stored with the task requirement document.

## Model Experience

### Task board

#### What the model sees

Nothing. The board is a browser projection and does not add model prompt content or tools.

#### Token effect

Zero direct tokens.

#### KV Cache effect

No direct effect.

## Known Limitations and Deferred Work

- Plan confirmation, clarification answers, test feedback, and task-detail Agent controls are not yet wired into the board.
- The board loads on first opening and supports explicit refresh; live Remote events are deferred.
