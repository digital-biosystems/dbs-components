import { bindable } from 'aurelia';

//custom element decorator for use in dev-app
@customElement('dbs-pgx-badge')
export class PgxBadge {
    @bindable descriptions = ["Use as directed","Use with caution.","Do not use."];
    @bindable state=0;
    @bindable drugCode=""
    fullprefixes=["","CAUTION","WARNING"]
    fullsuffixes=["","Dosage or regimen needs to be changed.","Consider alternative."]
    internalstate=0;
    colors=["w3-pale-green",'w3-pale-orange','w3-pale-red'];
    color = "";
    description ="";
    fulldescription="";
    fullprefix="";

    bound(){
        if (typeof this.state === 'string') this.internalstate = parseInt(this.state);
        else this.internalstate = this.state;        
        this.color = this.colors[this.internalstate];
        this.description = this.descriptions[this.internalstate];
        this.fullprefix = this.fullprefixes[this.internalstate];
        this.fullsuffix = this.fullsuffixes[this.internalstate];
        this.fulldescription = this.fullprefix+": "+this.description+" "+this.fullsuffix;
    }

    stateChanged(newVal, oldVal) {
        console.log('Value changed from'+ oldVal+' to '+newVal);
        if (typeof newVal === 'string') this.internalstate = parseInt(newVal);
        else this.internalstate = newVal;        
        this.color = this.colors[this.internalstate];
        this.description = this.descriptions[this.internalstate]
        this.fullprefix = this.fullprefixes[this.internalstate];
        this.fullsuffix = this.fullsuffixes[this.internalstate];
        this.fulldescription = this.fullprefix+": "+this.description+" "+this.fullsuffix;
    }
}