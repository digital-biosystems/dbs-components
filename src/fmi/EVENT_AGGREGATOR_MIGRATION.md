# FMI Component - EventAggregator Migration

## Summary of Changes

The FMI component has been migrated from using DOM `CustomEvent` to Aurelia's `EventAggregator` for event-driven communication. This provides better integration with the Aurelia framework and cleaner component communication.

## Key Changes Made

### 1. Import EventAggregator
```javascript
import { bindable, customElement, IEventAggregator } from 'aurelia';
```

### 2. Dependency Injection
The EventAggregator is injected into the constructor:
```javascript
constructor(IEventAggregator) {
  this.ea = IEventAggregator;
  // ... rest of initialization
}
```

### 3. Event Publishing (dispatchFmiEvent)
Previously used `CustomEvent` and `dispatchEvent`:
```javascript
// OLD - Aurelia 1
dispatchFmiEvent(eventName, global = false, detail = undefined) {
  const event = detail ? new CustomEvent(eventName, { detail }) : new CustomEvent(eventName);
  if (global) {
    document.dispatchEvent(event);
  } else {
    const el = document.getElementById(this.id);
    if (el) el.dispatchEvent(event);
  }
}
```

Now uses EventAggregator publish:
```javascript
// NEW - Aurelia 2
dispatchFmiEvent(eventName, global = false, detail = undefined) {
  // Create the channel name - scope to component id if not global
  const channel = global ? eventName : `${eventName}:${this.id}`;
  
  // Publish the event with optional detail data
  const payload = detail !== undefined ? detail : {};
  this.ea.publish(channel, payload);
  
  console.log(`[EventAggregator] Published '${channel}'`, payload);
}
```

### 4. Event Subscription (attached lifecycle)
Previously used DOM event listeners:
```javascript
// OLD - Aurelia 1
document.addEventListener('fmiregister', this.handleRegister);
document.addEventListener('dostep', this.handleStep);
```

Now uses EventAggregator subscriptions:
```javascript
// NEW - Aurelia 2
this.subscriptions.push(
  this.ea.subscribe('fmiregister', this.handleRegister)
);
this.subscriptions.push(
  this.ea.subscribe('dostep', this.handleStep)
);
```

### 5. Event Cleanup (detached lifecycle)
Previously used `removeEventListener`:
```javascript
// OLD - Aurelia 1
document.removeEventListener('fmiregister', this.handleRegister);
```

Now disposes subscriptions:
```javascript
// NEW - Aurelia 2
this.subscriptions.forEach(subscription => subscription.dispose());
this.subscriptions = [];
```

## Event Channels

### Global Events (published without scoping)
- `fmiregister` - Triggered when inputs need to be re-registered
- `dostep` - Triggered to execute a simulation step
- `fmiattached` - Triggered when the FMI component is attached

### Component-Scoped Events (published with component ID)
Format: `{eventName}:{componentId}`

- `fmireset:{id}` - Simulation reset
- `fmistart:{id}` - Simulation started
- `fmistop:{id}` - Simulation stopped

### Control-Scoped Events (when controlid is specified)
Format: `{eventName}:{controlId}`

- `fmistart:{controlId}` - Start command from control
- `fmistop:{controlId}` - Stop command from control

## Usage Examples

### Publishing Events from Other Components

```javascript
import { IEventAggregator } from 'aurelia';

export class MyController {
  constructor(IEventAggregator) {
    this.ea = IEventAggregator;
  }
  
  startFmiSimulation(fmiComponentId) {
    // Start a specific FMI component
    this.ea.publish(`fmistart:${fmiComponentId}`, { timestamp: Date.now() });
  }
  
  stopAllSimulations() {
    // If you have a control ID registered with FMI
    this.ea.publish(`fmistop:myControlId`, {});
  }
  
  requestStep() {
    // Trigger a step globally
    this.ea.publish('dostep', {});
  }
}
```

### Subscribing to FMI Events

```javascript
import { IEventAggregator } from 'aurelia';

export class SimulationMonitor {
  constructor(IEventAggregator) {
    this.ea = IEventAggregator;
    this.subscriptions = [];
  }
  
  attached() {
    // Listen for any FMI component being attached
    this.subscriptions.push(
      this.ea.subscribe('fmiattached', (data) => {
        console.log('FMI component attached', data);
      })
    );
    
    // Listen for a specific FMI component starting
    this.subscriptions.push(
      this.ea.subscribe('fmistart:myFmiComponentId', (data) => {
        console.log('Simulation started', data);
      })
    );
  }
  
  detached() {
    this.subscriptions.forEach(sub => sub.dispose());
    this.subscriptions = [];
  }
}
```

## Benefits of EventAggregator

1. **Framework Integration**: Native Aurelia pattern for component communication
2. **Type Safety**: Better when using TypeScript
3. **Testability**: Easier to mock and test
4. **Memory Management**: Automatic cleanup with subscription disposal
5. **Scoping**: Clear channel naming conventions for global vs component-specific events
6. **Decoupling**: Components don't need direct DOM access or references

## Migration Checklist for Other Components

If you need to migrate other components that communicate with FMI:

- [ ] Import `IEventAggregator` from 'aurelia'
- [ ] Inject EventAggregator in constructor
- [ ] Replace `new CustomEvent()` with `this.ea.publish()`
- [ ] Replace `addEventListener()` with `this.ea.subscribe()`
- [ ] Replace `removeEventListener()` with `subscription.dispose()`
- [ ] Store subscriptions in an array for cleanup
- [ ] Update channel names to match new naming convention
- [ ] Clean up subscriptions in `detached()` lifecycle hook

## Backward Compatibility Notes

This migration removes DOM event support. Any external components using DOM events need to be updated to use EventAggregator. If you need temporary backward compatibility, you can:

1. Keep both approaches during transition
2. Create a wrapper that listens to EventAggregator and dispatches DOM events
3. Document the deprecation timeline

## Testing

To test EventAggregator integration:

```javascript
import { IEventAggregator } from 'aurelia';

describe('FMI Component', () => {
  let ea;
  let component;
  
  beforeEach(() => {
    ea = new IEventAggregator();
    component = new Fmi(ea);
  });
  
  it('should publish fmistart event', () => {
    const spy = jest.fn();
    ea.subscribe('fmistart:testId', spy);
    
    component.id = 'testId';
    component.dispatchFmiEvent('fmistart', false, { time: 0 });
    
    expect(spy).toHaveBeenCalledWith({ time: 0 });
  });
});
```
