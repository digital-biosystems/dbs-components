// Handles registration and deregistration of input elements and event listeners for FMI
export class FmiInputManager {
  constructor(fmiInstance) {
    this.fmi = fmiInstance;
  }

  registerInputs() {
    // Logic moved from Fmi.registerInputs
    if (this.fmi.inputs) {
      let inputparts = this.fmi.inputs.split(';');
      this.fmi.inputreferences = [];
      for (let inputpart of inputparts) {
        let myinputs = inputpart.split(',');
        let inputid = myinputs[0].trim();
        let numerator = (myinputs.length > 2) ? parseFloat(myinputs[2]) : 1;
        let denominator = (myinputs.length > 3) ? parseFloat(myinputs[3]) : 1;
        let addconst = (myinputs.length > 4) ? parseFloat(myinputs[4]) : 0;
        let fixedsignature = (myinputs.length > 5) ? (myinputs[5] === 'f') : false;
        if (isNaN(addconst)) {
          addconst = 0;
          fixedsignature = myinputs[4] === 'f';
        }
        let inputref = {ref: myinputs[1], numerator: numerator, denominator: denominator, addconst: addconst, fixed: fixedsignature};
        if (this.fmi.inputreferences[inputid]) {
          this.fmi.inputreferences[inputid].fixed = this.fmi.inputreferences[inputid].fixed || fixedsignature;
          this.fmi.inputreferences[inputid].refs.push(inputref);
        } else {
          this.fmi.inputreferences[inputid] = {fixed:fixedsignature,refs:[inputref]};
        }
        let dependentEl = document.getElementById(inputid);
        if (!dependentEl) {
          //try to find in shadow DOM
          console.warn('looking for element in shadow DOM:', this.fmi.parentelement);
          if (this.fmi.parentelement && this.fmi.parentelement.shadowRoot) {
            dependentEl = this.fmi.parentelement.shadowRoot.getElementById(inputid);
          }
        }
        if (dependentEl) {
          dependentEl.addEventListener(this.fmi.eventlisten, this.fmi.handleValueChange);
          console.warn('registering input, ref, num,den,add,fixed', inputid, myinputs[1], numerator, denominator, addconst, fixedsignature);
        } else {          
          if (!window.animateranges) window.animateranges = [];
          window.animateranges.push({
            name:inputid,
            handleValueChange: this.fmi.handleValueChange
          });
          console.warn('non-existing element id, will try to register to animation:', myinputs[0]);
          console.warn('shadowroot:', this.shadowRoot);
        }
      }
    }
    if (this.fmi.otherinputs) {
      let otherinputtargets = this.fmi.otherinputs.split(';');
      for (let target of otherinputtargets) {
        document.getElementById(target).addEventListener('fmiinput', this.fmi.handleDetailChange);
      }
    }
  }

  deregisterInputs() {
    window.animateranges = [];
    if (this.fmi.inputs) {
      for (const inputpart of this.fmi.inputs.split(';')) {
        const inputId = inputpart.split(',')[0].trim();
        const el = this.fmi.resolveInputElementById(inputId);
        if (el) el.removeEventListener(this.fmi.eventlisten, this.fmi.handleValueChange);
      }
    }
    if (this.fmi.otherinputs) {
      for (const target of this.fmi.otherinputs.split(';')) {
        const el = document.getElementById(target);
        if (el) el.removeEventListener('fmiinput', this.fmi.handleDetailChange);
      }
    }
  }
}
