import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ISubscription } from 'rxjs/Subscription';
import { Observable } from 'rxjs/Rx';

import { ProposalService } from './services/proposal.service';
import { CommonService } from '../common/services/common.service';

declare var $: any;

@Component({
  selector: 'app-proposal',
  templateUrl: './proposal.component.html',
  styleUrls: ['./proposal.component.css']
})
export class ProposalComponent implements OnInit, OnDestroy {

  result: any = {};
  showOrHideDataFlagsObj = {
    mode : '',
    currentTab: (localStorage.getItem('currentTab') == null) ? 'PROPOSAL_HOME' : localStorage.getItem('currentTab'),
    isGrantCallWdgtOpen: true,
    isAreaOfResearchWidgetOpen: true,
    isProjectTeamWidgetOpen: true,
    isProjectDescWdgtOpen: true,
    isSpecialReviewWidgetOpen: true,
    isDeclarationWidgetOpen: true,
    isBudgetWdgtOpen: true,
    isAttachmentListOpen: true,
    isShowSaveWarningModal: false,
    isShowSaveSuccessModal: false,
    isShowSubmitWarningModal: false,
    isShowSubmitSuccessModal: false,
    isShowSaveBeforeExitWarning: false,
    isShowNotifyApprover: false,
    isShowNotifyApproverSuccess: false,
    isShowNotificationPISuccessModal: false
  };

  isShowMoreOptions = false;
  isShowPreReviewModalOptions = false;
  isPreReviewExist = false;
  isReviewMandatoryFilled = true;
  isAttachmentIncomplete = false;
  isShowRouteLog = false;

  toast_message = '';
  clearField;
  superUser = localStorage.getItem( 'superUser');
  approveDisapprovePlaceHolder: string;
  modalAproveHeading: string;
  approveComments: string;

  selectedReviewAttachment = [];
  isReviewTypeOpen = [];
  uploadedFile = [];

  warningMsgObj: any = {};
  proposalDataBindObj: any = {};
  mandatoryObj: any = {};
  addPreReviewerObj: any = {};
  elasticSearchOptions: any = {};
  requestObject: any = {};
  showApproveDisapproveModal = {
    isReadyToApprove: false
  };

  versionHistorySelected: number;
  workflowDetailsMap: any = [];
  selectedAttachmentStop: any = [];
  commentsApproverExpand: any = {};

  private autoSave_subscription: ISubscription;

  constructor( private _route: ActivatedRoute, private _proposalService: ProposalService,
    private _router: Router, private _commonService: CommonService ) {
    this.proposalDataBindObj.dataChangeFlag = false;
    this.autoSave_subscription = Observable.interval(1000 * 10).subscribe(x => {
      if (this.result.proposal.proposalId !== null && this.result.proposal.statusCode !== 11) {
          this.saveProposal('autoSave');
      }
    });
   }

  ngOnInit() {
    this.elasticSearchOptions.url   = this._commonService.elasticIndexUrl;
    this.elasticSearchOptions.index = 'fibiperson';
    this.elasticSearchOptions.type  = 'person';
    this.elasticSearchOptions.size  = 20;
    this.elasticSearchOptions.contextField = 'full_name';
    this.elasticSearchOptions.debounceTime = 500;
    this.elasticSearchOptions.fields = {
      full_name: {},
      prncpl_nm: {}
    };
    this.result = this._route.snapshot.data.proposalDetails;
    if (this._route.snapshot.queryParamMap.get('proposalId') == null) {
      this.showOrHideDataFlagsObj.mode = 'create';
    } else {
        if (this.result.proposal.statusCode === 2 || this.result.proposal.statusCode === 11) {
            this.showOrHideDataFlagsObj.mode = 'view';
        } else {
            this.showOrHideDataFlagsObj.mode = 'edit';
        }
    }
    this.initialiseProposalFormElements();
  }

  showTab(currentTab) {
    if (currentTab === 'BUDGET' && this.result.proposal.budgetHeader == null) {
      if (this.result.proposal.proposalId != null ) {
        this._proposalService.createProposalBudget({'userName': localStorage.getItem('currentUser'),
        'userFullName': localStorage.getItem('userFullname'), 'proposal': this.result.proposal})
          .subscribe( data => {
            let tempryProposalObj: any = {};
            tempryProposalObj = data;
            this.result.proposal = tempryProposalObj.proposal;
            this.showOrHideDataFlagsObj.currentTab = currentTab;
            localStorage.setItem('currentTab', currentTab);
          });
      } else {
        this.saveProposal('partialSave');
      }
    } else {
      this.showOrHideDataFlagsObj.currentTab = currentTab;
      localStorage.setItem('currentTab', currentTab);
    }
  }

  initialiseProposalFormElements() {
    this.proposalDataBindObj.proposalStartDate = this.result.proposal.startDate === null ?
      null : new Date(this.result.proposal.startDate);
    this.proposalDataBindObj.proposalEndDate = this.result.proposal.endDate === null ?
      null : new Date(this.result.proposal.endDate);
    this.proposalDataBindObj.sponsorDeadlineDate = this.result.proposal.submissionDate === null ?
      null : new Date(this.result.proposal.submissionDate);
    this.proposalDataBindObj.internalDeadlineDate = this.result.proposal.internalDeadLineDate === null ?
      null : new Date(this.result.proposal.internalDeadLineDate);
    this.proposalDataBindObj.selectedResearchType = this.result.proposalResearchTypes === null ?
      null : this.result.proposalResearchTypes[0].description;
    this.proposalDataBindObj.selectedAreaType = this.result.proposalResearchTypes === null ?
      null : this.result.proposalResearchTypes[0].description;
    if ( this.requestObject.actionType === 'R' ) {
      this.showOrHideDataFlagsObj.mode = 'edit';
    }
    this.proposalDataBindObj.selectedProposalType = ( this.result.proposal.proposalType != null ) ?
                            this.result.proposal.proposalType.description : null;
    this.proposalDataBindObj.selectedProposalCategory = ( this.result.proposal.activityType != null ) ?
                            this.result.proposal.activityType.description : null;
    // set default grantCallType to Others if no grant call is associated with the proposal
    if (this.result.proposal.grantCallType == null) {
      this.result.proposal.grantCallType = this.result.defaultGrantCallType;
      this.result.proposal.grantTypeCode = this.result.defaultGrantCallType.grantTypeCode;
    } else if (this.result.proposal.grantCall != null) {
      this.result.proposal.grantCallType = this.result.proposal.grantCall.grantCallType;
      this.result.proposal.grantTypeCode = this.result.proposal.grantCall.grantCallType.grantTypeCode;
    } else if (this.result.proposal.grantCall == null) { }
  }

  // proposal details validation
  proposalValidation() {
    if ( this.result.proposal.title === '' || this.result.proposal.title == null ) {
        this.mandatoryObj.field = 'title';
    } else if ( this.proposalDataBindObj.selectedProposalCategory == null ||
              this.proposalDataBindObj.selectedProposalCategory === 'null' ) {
      this.mandatoryObj.field = 'category';
    } else if ( this.proposalDataBindObj.selectedProposalType == null || this.proposalDataBindObj.selectedProposalType === 'null') {
        this.mandatoryObj.field = 'type';
    } else if ( this.result.proposal.homeUnitName === '' || this.result.proposal.homeUnitName == null) {
        this.mandatoryObj.field = 'homeUnit';
    } else if (this.result.proposal.sponsorName === '' || this.result.proposal.sponsorName == null) {
        this.mandatoryObj.field = 'sponsor';
    } else if (this.proposalDataBindObj.proposalStartDate === '' || this.proposalDataBindObj.proposalStartDate == null) {
      this.mandatoryObj.field = 'proposalStartDate';
    } else if (this.proposalDataBindObj.proposalEndDate === '' || this.proposalDataBindObj.proposalEndDate == null) {
      this.mandatoryObj.field = 'proposalEndDate';
    } else if (this.proposalDataBindObj.sponsorDeadlineDate === '' || this.proposalDataBindObj.sponsorDeadlineDate == null) {
      this.mandatoryObj.field = 'sponsorDeadlineDate';
    }else {
        this.mandatoryObj.field = null;
    }
    if ( this.result.proposal.proposalPersons.length > 0 ) {
      let PIExists = {};
      PIExists = this.result.proposal.proposalPersons.find( persons => persons.proposalPersonRole.description === 'Principal Investigator');
      if (PIExists == null) {
        this.warningMsgObj.personWarningMsg = '* Select a member as PI';
      } else {
        this.warningMsgObj.personWarningMsg = null;
      }
    } else {
        this.warningMsgObj.personWarningMsg = '* Select atleast one team member';
    }
  }

  openGoBackModal() {
    if (this.proposalDataBindObj.dataChangeFlag) {
      this.showOrHideDataFlagsObj.isShowSaveBeforeExitWarning = true;
    } else {
      this._router.navigate(['/fibi/dashboard/proposalList']);
    }
  }

  closeGoBackModal() {
    this.showOrHideDataFlagsObj.isShowSaveBeforeExitWarning = false;
    this._router.navigate(['/fibi/dashboard/proposalList']);
  }

  saveProposal(saveType) {
    this.showOrHideDataFlagsObj.isShowSaveWarningModal = false;
    // preserve showOrHideDataFlagsObj.isShowSaveSuccessModal value if autosave to show message in popup else make it false
    this.showOrHideDataFlagsObj.isShowSaveSuccessModal = (saveType === 'autoSave') ?
                                                          this.showOrHideDataFlagsObj.isShowSaveSuccessModal : false;
    this.proposalValidation();
    if (this.mandatoryObj.field != null || this.warningMsgObj.personWarningMsg != null || this.warningMsgObj.dateWarningText != null) {
      this.showOrHideDataFlagsObj.isShowSaveWarningModal = true;
      this.showOrHideDataFlagsObj.isShowSaveBeforeExitWarning = false;
    } else {
      const TYPE = ( this.result.proposal.proposalId != null ) ? 'UPDATE' : 'SAVE';
      if (TYPE === 'SAVE') {
        this.result.proposal.createUser = localStorage.getItem('currentUser');
      }
      this.result.proposal.createTimeStamp = new Date().getTime();
            this.result.proposal.updateUser = localStorage.getItem('currentUser');
            this.result.proposal.updateTimeStamp = new Date().getTime();
            this.result.proposal.startDate = new Date(this.proposalDataBindObj.proposalStartDate).getTime();
            this.result.proposal.endDate = new Date(this.proposalDataBindObj.proposalEndDate).getTime();
            this.result.proposal.submissionDate = new Date(this.proposalDataBindObj.sponsorDeadlineDate).getTime();
            this.result.proposal.internalDeadLineDate = new Date(this.proposalDataBindObj.internalDeadlineDate).getTime();
            this.mandatoryObj.ismandatory = false;
            this.updateAttachmentStatus();
            this._proposalService.saveProposal({'proposal': this.result.proposal,
              'updateType': TYPE, 'personId': localStorage.getItem( 'personId' )}).subscribe( data => {
                // when route log is open and autosave happens version changes automatically, so update only proposal obj
                let tempProposalData: any = {};
                tempProposalData = data;
                this.result.proposal = tempProposalData.proposal;
            },
            err  => { this.warningMsgObj.errorMsg = 'Error in saving proposal'; },
            () => {
              if (saveType === 'autoSave') {
                const toastId      = document.getElementById('toast-success-proposal');
                this.toast_message = 'Changes has been saved automatically ';
                toastId.className = 'show';
                setTimeout(function () {
                toastId.className = toastId.className.replace('show', '');
                }, 2000);
              } else if (saveType === 'partialSave') {
                this.showTab('BUDGET');
              } else if (saveType === 'promptSave') {
                $('#warning-modal').modal('hide');
                this._router.navigate(['/fibi/dashboard/proposalList']);
              } else {
                this.showOrHideDataFlagsObj.isShowSaveSuccessModal = true;
                document.getElementById('openSucessModal').click();
              }
              this.proposalDataBindObj.dataChangeFlag = false;
          });
    }
  }

  openNotifyApprover() {
    $('#successModal').modal('hide');
    if (this.result.proposal.statusCode === 2) {
      let isDocCompleted = false;
      for (const DOCUMENT of this.result.proposal.proposalAttachments) {
          if (DOCUMENT.narrativeStatusCode === 'C' ) {
            isDocCompleted = true;
          } else {
            isDocCompleted = false;
            break;
          }
      }
      if (isDocCompleted) {
        this.showOrHideDataFlagsObj.isShowNotifyApprover = true;
      }
    }
  }

  updateAttachmentStatus() {
    for (const attachment of this.result.proposal.proposalAttachments) {
      const attachmentStatusObj = this.result.narrativeStatus.find( status =>
                                  status.description === attachment.narrativeStatus.description);
      attachment.narrativeStatus = attachmentStatusObj;
      attachment.narrativeStatusCode = attachmentStatusObj.code;
    }
  }

  closeWarningModal() {
    this.showOrHideDataFlagsObj.isShowSaveWarningModal = false;
    this.showOrHideDataFlagsObj.isShowSaveSuccessModal = false;
    this.showOrHideDataFlagsObj.isShowSubmitSuccessModal = false;
    this.showOrHideDataFlagsObj.isShowSubmitWarningModal = false;
    this.showOrHideDataFlagsObj.isShowSaveBeforeExitWarning = false;
    this.showOrHideDataFlagsObj.isShowNotifyApprover = false;
    this.showOrHideDataFlagsObj.isShowNotifyApproverSuccess = false;
    this.showOrHideDataFlagsObj.isShowNotificationPISuccessModal = false;
    this.warningMsgObj.submitConfirmation = null;
    this.warningMsgObj.submitWarningMsg = null;
    this.warningMsgObj.errorMsg = null;
  }

  copyProposal(event) {
    event.preventDefault();
    this.result.userFullName = localStorage.getItem('currentUser');
    this.result.proposal.updateUser = localStorage.getItem('currentUser');
    this._commonService.copyProposal(this.result).subscribe(success => {
    let temryProposalObj: any = {};
    temryProposalObj = success;
      this._router.navigate(['/fibi/proposal'], { queryParams: { 'proposalId': temryProposalObj.proposal.proposalId }});
      window.location.reload();
    });
  }

  checkSubmitProposalValidation() {
    this.proposalValidation();
    if (this.mandatoryObj.field != null || this.warningMsgObj.personWarningMsg != null || this.warningMsgObj.dateWarningText != null) {
      this.showOrHideDataFlagsObj.isShowSaveWarningModal = true;
    } else if (this.result.proposal.proposalAttachments.length === 0) {
      this.showOrHideDataFlagsObj.isShowSubmitWarningModal = true;
      this.warningMsgObj.submitWarningMsg = 'Please add atleast one supporting document to submit the proposal.';
    } else {
      this.showOrHideDataFlagsObj.isShowSubmitWarningModal = true;
      this.warningMsgObj.submitConfirmation = 'Are you sure you want to submit this proposal?';
    }
  }

  submitProposal() {
    this.result.proposal.updateTimeStamp = new Date().getTime();
    this.result.proposal.updateUser = localStorage.getItem('currentUser');
    this.result.proposal.submitUser = localStorage.getItem('currentUser');
    this.updateAttachmentStatus();
    this._proposalService.submitProposal({'proposal': this.result.proposal, 'userName': localStorage.getItem( 'currentUser' ),
    'personId': localStorage.getItem( 'personId' ), 'proposalStatusCode': this.result.proposalStatusCode}).subscribe( data => {
      let tempryProposalObj: any = {};
      tempryProposalObj = data;
      this.result = tempryProposalObj;
      this.result.workflow = tempryProposalObj.workflow;
      // this.updateWorkflowStops();
      // this.updateRouteLogHeader();
      // this.isDeclarationSectionRequired = this.result.isDeclarationSectionRequired;
    },
    err => {
      $('#warning-modal').modal('hide');
      this.warningMsgObj.errorMsg = 'Error in submitting proposal';
      document.getElementById('openSucessModal').click();
      },
    () => {
      $('#warning-modal').modal('hide');
      this.showOrHideDataFlagsObj.isShowSubmitSuccessModal = true;
      document.getElementById('openSucessModal').click();
      this.showOrHideDataFlagsObj.mode = 'view';
    } );
  }

  printProposal(event) {
    event.preventDefault();
      this._proposalService.printProposal(this.result.proposal.proposalId).subscribe(
        data => {
          const temp: any = data || {};
          const printProposalDataElement = document.createElement('a');
          printProposalDataElement.href = URL.createObjectURL(temp);
          printProposalDataElement.download = this.result.proposal.title;
          printProposalDataElement.click();
        });
    }

    getPreReview() {
      this.addPreReviewerObj = {};
      this.addPreReviewerObj.preReviewType = null;
      if (this.result.proposal.proposalPreReviews != null) {
        if (this.result.proposal.proposalPreReviews.length <= 0) {
          this.isShowPreReviewModalOptions = true;
        } else {
          this.isShowPreReviewModalOptions = false;
          this.result.proposal.proposalPreReviews.forEach((reviews, reviewsIndex) => {
            this.selectedReviewAttachment[reviewsIndex] = [];
              reviews.proposalPreReviewComments.forEach((value, index) => {
              if (value.proposalPreReviewAttachments.length !== 0) {
                this.selectedReviewAttachment[reviewsIndex][index] = value.proposalPreReviewAttachments[0].fileName;
              }
            });
          });
        }
      }
    }

  showRequestNewReview() {
    this.isShowPreReviewModalOptions = !this.isShowPreReviewModalOptions;
    this.isReviewMandatoryFilled = true;
    this.isPreReviewExist = false;
    this.addPreReviewerObj = {};
    this.addPreReviewerObj.preReviewType = null;
  }

  selected( value ) {
    if ( value != null) {
        this.addPreReviewerObj.reviewerPersonId = value.prncpl_id;
        this.addPreReviewerObj.reviewerFullName = value.full_name;
        this.addPreReviewerObj.reviewerEmailAddress = value.email_addr;
    } else {
        this.addPreReviewerObj.reviewerPersonId = null;
        this.addPreReviewerObj.reviewerFullName = null;
        this.addPreReviewerObj.reviewerEmailAddress = null;
    }
  }

  closePreReviewModal() {
    this.addPreReviewerObj = {};
    this.isShowPreReviewModalOptions = false;
    this.selectedReviewAttachment = [];
    this.isReviewTypeOpen = [];
    this.isReviewMandatoryFilled = true;
    this.isPreReviewExist = false;
  }

  addPreReviewer() {
    this.isReviewMandatoryFilled = true;
    this.isPreReviewExist = false;
    if ( this.addPreReviewerObj.preReviewType == null || this.addPreReviewerObj.preReviewType === 'null' ||
        this.addPreReviewerObj.requestorComment == null || this.addPreReviewerObj.requestorComment === '' ||
        this.addPreReviewerObj.reviewerPersonId == null) {
        this.isReviewMandatoryFilled = false;
     } else {
      this.addPreReviewerObj.reviewTypeCode = this.addPreReviewerObj.preReviewType.reviewTypeCode;
      this.addPreReviewerObj.proposalId = this.result.proposal.proposalId;
      this.addPreReviewerObj.requestorPersonId = localStorage.getItem('personId');
      this.addPreReviewerObj.requestorFullName = localStorage.getItem('userFullname');
      this.addPreReviewerObj.requestorEmailAddress = localStorage.getItem('userEmailId');
      this.addPreReviewerObj.requestDate = new Date().getTime();
      this.addPreReviewerObj.updateTimeStamp = new Date().getTime();
      this.addPreReviewerObj.updateUser = localStorage.getItem( 'currentUser' );
      this._proposalService.createProposalPreReview ({'proposal': this.result.proposal,
        'newProposalPreReview': this.addPreReviewerObj, 'personId': localStorage.getItem( 'personId' )})
        .subscribe( data => {
          // tslint:disable-next-line:no-construct
          this.clearField = new String('true');
          let temp: any = {};
          temp = data || [];
          if (temp.proposal.preReviewExist) {
            this.isPreReviewExist = true;
          } else {
            this.result.proposal = temp.proposal;
            this.addPreReviewerObj = {};
            this.addPreReviewerObj.preReviewType = null;
            this.isShowPreReviewModalOptions = false;
          }
        });
     }
  }

  downloadReviewAttachment( event, selectedFileName, selectedAttachArray: any[] ) {
    event.preventDefault();
      for ( const ATTACHMENT of selectedAttachArray ) {
        if ( ATTACHMENT.fileName === selectedFileName ) {
          this._proposalService.downloadPreReviewAttachment( ATTACHMENT.preReviewAttachmentId )
          .subscribe(
            data => {
                const a = document.createElement( 'a' );
                a.href = URL.createObjectURL( data );
                a.download = ATTACHMENT.fileName;
                a.click();
            } );
        }
      }
  }

  updatePreReviewAttachmentSelectbox() {
    this.result.proposal.reviewerReview.proposalPreReviewComments.forEach((value, index) => {
      if (value.proposalPreReviewAttachments.length !== 0) {
        this.selectedReviewAttachment[index] = value.proposalPreReviewAttachments[0].fileName;
      }
    });
  }

  fileDrop(files) {
    this.warningMsgObj.attachmentWarningMsg = null;
    let dupCount = 0;
    for (let index = 0; index < files.length; index++) {
      if (this.uploadedFile.find(dupFile => dupFile.name === files[index].name) != null) {
        dupCount = dupCount + 1;
        this.warningMsgObj.attachmentWarningMsg = '* ' + dupCount + ' File(s) already added';
      } else {
        this.uploadedFile.push(files[index]);
      }
    }
  }

  deleteFromUploadedFileList(index) {
    this.uploadedFile.splice(index, 1);
    this.warningMsgObj.attachmentWarningMsg = null;
  }

  addPreReview() {
    this.isReviewMandatoryFilled = true;
    if (this.addPreReviewerObj.reviewComment == null || this.addPreReviewerObj.reviewComment === '') {
      this.isReviewMandatoryFilled = false;
    } else {
      this.addPreReviewerObj.proposalId = this.result.proposal.proposalId;
      this.addPreReviewerObj.updateTimeStamp = new Date().getTime();
      this.addPreReviewerObj.updateUser = localStorage.getItem('currentUser');
      this.result.proposal.reviewerReview.proposalPreReviewComments.push(this.addPreReviewerObj);

      const formData = new FormData();
      for ( let i = 0; i < this.uploadedFile.length; i++ ) {
          formData.append( 'files', this.uploadedFile[i] );
      }
      const sendObject = {
          proposal: this.result.proposal,
          userName: localStorage.getItem( 'currentUser' )
      };
      formData.append( 'formDataJson', JSON.stringify( sendObject ) );

      this._proposalService.addPreReviewComment( formData ).subscribe( success => {
          let temporaryObject: any = {};
          temporaryObject = success;
          this.result.proposal = temporaryObject.proposal;
          this.updatePreReviewAttachmentSelectbox();
          this.clearPreReviewDatas();
      });
    }
  }

  approveDisapprovePreReview(actionType) {
    this._proposalService.approveOrDisapprovePreReview( {'proposal': this.result.proposal,
      'actionType': actionType, 'personId': localStorage.getItem( 'personId' )} ).subscribe( success => {
    let temporaryObject: any = {};
    temporaryObject = success;
    this.result.proposal = temporaryObject.proposal;
    this.updatePreReviewAttachmentSelectbox();
    this.clearPreReviewDatas();
    }, err => {
        $('#completePreReviewModal').modal('hide');
        this.warningMsgObj.errorMsg = 'Error in approve/disapprove pre-review';
        document.getElementById('openSucessModal').click();
      },
    () => { $('#completePreReviewModal').modal('hide'); });
  }

  clearPreReviewDatas() {
    this.addPreReviewerObj = {};
    this.uploadedFile = [];
    this.isReviewMandatoryFilled = true;
  }

 /* approve proposal */
 approveProposal() {
  this.checkPreReviewCompletion();
  this.proposalDataBindObj.modalAproveHeading = 'Approve';
  if (this.showApproveDisapproveModal.isReadyToApprove) {
    this.requestObject = {};
    this.requestObject.actionType = 'A';
    this.isAttachmentIncomplete = false;
    if (!this.result.finalApprover && this.result.isApproved === false) {
      const attachments = this.result.proposal.proposalAttachments.find(attachment => attachment.narrativeStatus.code === 'I');
      this.isAttachmentIncomplete = (attachments != null) ? true : false;
    }
  }
}

  /* disapprove proposal */
  disapproveProposal() {
    this.showApproveDisapproveModal.isReadyToApprove = true;
    this.requestObject = {};
    this.proposalDataBindObj.modalAproveHeading = 'Disapprove';
    this.requestObject.actionType = 'R';
  }

  /* checking whether any prereview exists with inprogress status */
  checkPreReviewCompletion() {
    if (this.result.finalApprover && this.result.isPreReviewCompletionRequired) {
      const prereviews = this.result.proposal.proposalPreReviews.find(prereview => prereview.preReviewStatus.reviewStatusCode === '1');
      this.showApproveDisapproveModal.isReadyToApprove = (prereviews != null) ? false : true;
    } else {
      this.showApproveDisapproveModal.isReadyToApprove = true;
    }
  }

  /* approves or disapproves proposal */
  approveDisapproveProposal() {
    this.requestObject.personId = localStorage.getItem('personId');
    this.requestObject.proposalId = this.result.proposal.proposalId;
    this.requestObject.isSuperUser = this.superUser;
    this.requestObject.approverStopNumber = this.result.approverStopNumber;
    this.requestObject.approveComment = this.approveComments;
    const approveFormData = new FormData();
    approveFormData.delete( 'files' );
    approveFormData.delete( 'formDataJson' );

    for ( let i = 0; i < this.uploadedFile.length; i++ ) {
      approveFormData.append( 'files', this.uploadedFile[i] );
    }
    approveFormData.append( 'formDataJson', JSON.stringify( this.requestObject ) );
    this._proposalService.approveDisapproveProposal(approveFormData ).subscribe(data => {
      let temp: any = {};
      temp = data;
      this.result = temp;
      this.initialiseProposalFormElements();
    },
    err => {
      $('#approveDisapproveModal').modal('hide');
      this.warningMsgObj.errorMsg = 'Error in approve/disapprove proposal';
      document.getElementById('openSucessModal').click();
     },
    () => {
    $('#approveDisapproveModal').modal('hide');
    this.proposalDataBindObj.modalAproveHeading = null; });
    this.approveComments = '';
    this.uploadedFile = [];
  }

  openRouteLog() {
    this.versionHistorySelected = this.result.workflow.workflowSequence;
    this.routeLogVersionChange();
    this.isShowRouteLog = true;
  }

  updateWorkflowStops() {
    this.workflowDetailsMap = [];
    if ( this.result.workflow != null && this.result.workflow.workflowDetails.length > 0 ) {
        for (const KEY in this.result.workflow.workflowDetailMap) {
          if (this.result.workflow.workflowDetailMap[KEY] !== null) {
            const value = this.result.workflow.workflowDetailMap[KEY];
            this.workflowDetailsMap.push(value);
          }
        }
    }
  }

  routeLogVersionChange() {
    for (const WORKFLOW of this.result.workflowList) {
      if (WORKFLOW.workflowSequence.toString() === this.versionHistorySelected.toString()) {
        this.workflowDetailsMap = [];
        for (const KEY in WORKFLOW.workflowDetailMap) {
          if (KEY != null) {
          const value = WORKFLOW.workflowDetailMap[KEY];
          this.workflowDetailsMap.push(value);
          }
        }
      }
    }
    this.updateWorkflowattachments();
  }

  updateWorkflowattachments () {
    this.workflowDetailsMap.forEach(( value, index ) => {
      this.selectedAttachmentStop[index] = [];
      value.forEach(( workFlowValue, valueIndex ) => {
          if ( workFlowValue.workflowAttachments != null && workFlowValue.workflowAttachments.length > 0 ) {
            this.selectedAttachmentStop[index][valueIndex] = workFlowValue.workflowAttachments[0].fileName;
          }
      });
    });
  }

  downloadRouteAttachment( event, selectedFileName, selectedAttachArray: any[] ) {
    event.preventDefault();
    const attachment = selectedAttachArray.find(attachmentDetail => attachmentDetail.fileName === selectedFileName);
    if ( attachment != null) {
      this._commonService.downloadRoutelogAttachment( attachment.attachmentId ).subscribe(
        data => {
            const a = document.createElement( 'a' );
            a.href = URL.createObjectURL( data );
            a.download = attachment.fileName;
            a.click();
        } );
    }
  }

  closeApproveDisapproveModal() {
  this.approveComments = '';
  this.uploadedFile = [];
  // this.showApproveDisapproveModal.isReadyToApprove = false;
  this.isAttachmentIncomplete = false;
  }

  notifyAttachmentIncomplete() {
  this._proposalService.sendPIAttachmentNotification( this.result ).subscribe( data => {
      let temp: string;
      temp = data;
  },
  err  => {},
  () => {
      document.getElementById('openSucessModal').click();
      this.showOrHideDataFlagsObj.isShowNotificationPISuccessModal = true;
  } );
  }

  notifyApprover() {
    this._proposalService.sendDocCompleteApproverNotification( this.result ).subscribe( data => {
      let temp: string;
      temp = data;
      if ( temp === 'SUCCESS') {
        this.showOrHideDataFlagsObj.isShowNotifyApproverSuccess = true;
      }
    },
    err  => {
      $('#warning-modal').modal('hide');
      this.warningMsgObj.errorMsg = 'Error in notifying approver';
      document.getElementById('openSucessModal').click(); },
    () => {
      this.showOrHideDataFlagsObj.isShowNotifyApprover = false;
      $('#warning-modal').modal('hide');
      document.getElementById('openSucessModal').click();
    } );
  }

  ngOnDestroy() {
    this.autoSave_subscription.unsubscribe();
  }

}
