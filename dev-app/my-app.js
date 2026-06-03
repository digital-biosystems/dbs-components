export class MyApp {
	selectedWeight = '-';
	selectedRenalLiver = '-';
	selectedSlc22a2 = '-';
	selectedCyp2c19 = '-';
	selectedDosage = '-';

	chooseWeight(value) {
		this.selectedWeight = value;
	}

	chooseRenalLiver(value) {
		this.selectedRenalLiver = value;
	}

	chooseSlc22a2(value) {
		this.selectedSlc22a2 = value;
	}

	chooseCyp2c19(value) {
		this.selectedCyp2c19 = value;
	}

	chooseDosage(value) {
		this.selectedDosage = value;
	}

	get chosenValuesText() {
		return `weight: ${this.selectedWeight}, renal/liver function: ${this.selectedRenalLiver}, PGx: SLA22CA2 ${this.selectedSlc22a2}, CYP2C19 ${this.selectedCyp2c19}; dosage: ${this.selectedDosage}`;
	}
}
