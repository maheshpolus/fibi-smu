import { Component, OnInit, Input } from '@angular/core';

import { ProposalComponent } from '../../proposal.component';

@Component({
  selector: 'app-proposal-view',
  templateUrl: './proposal-view.component.html',
  styleUrls: ['./proposal-view.component.css']
})
export class ProposalViewComponent implements OnInit {

  @Input() result: any = {};
  @Input() showOrHideDataFlagsObj: any = {};
  @Input() proposalDataBindObj: any = {};

  isAbsDescReadMore = false;

  constructor( private _proposalComponent: ProposalComponent) { }

  ngOnInit() {}

}
