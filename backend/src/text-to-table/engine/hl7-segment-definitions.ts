interface ComponentDef {
  index: number;
  name: string;
}

interface FieldDef {
  index: number;
  name: string;
  dataType: string;
  components: ComponentDef[];
}

interface SegmentDef {
  code: string;
  name: string;
  fields: FieldDef[];
}

const xpnComponents: ComponentDef[] = [
  { index: 1, name: 'FamilyName' },
  { index: 2, name: 'GivenName' },
  { index: 3, name: 'MiddleName' },
  { index: 4, name: 'Suffix' },
  { index: 5, name: 'Prefix' },
  { index: 6, name: 'Degree' },
  { index: 7, name: 'NameTypeCode' },
];

const xadComponents: ComponentDef[] = [
  { index: 1, name: 'StreetAddress' },
  { index: 2, name: 'OtherDesignation' },
  { index: 3, name: 'City' },
  { index: 4, name: 'StateOrProvince' },
  { index: 5, name: 'ZipOrPostalCode' },
  { index: 6, name: 'Country' },
  { index: 7, name: 'AddressType' },
];

const xtnComponents: ComponentDef[] = [
  { index: 1, name: 'TelephoneNumber' },
  { index: 2, name: 'TelecommunicationUseCode' },
  { index: 3, name: 'TelecommunicationEquipmentType' },
  { index: 4, name: 'EmailAddress' },
  { index: 5, name: 'CountryCode' },
  { index: 6, name: 'AreaCityCode' },
  { index: 7, name: 'LocalNumber' },
  { index: 8, name: 'Extension' },
];

const cxComponents: ComponentDef[] = [
  { index: 1, name: 'IdNumber' },
  { index: 2, name: 'CheckDigit' },
  { index: 4, name: 'AssigningAuthority' },
  { index: 5, name: 'IdentifierTypeCode' },
  { index: 6, name: 'AssigningFacility' },
];

const cweComponents: ComponentDef[] = [
  { index: 1, name: 'Identifier' },
  { index: 2, name: 'Text' },
  { index: 3, name: 'NameOfCodingSystem' },
  { index: 4, name: 'AlternateIdentifier' },
  { index: 5, name: 'AlternateText' },
  { index: 6, name: 'NameOfAlternateCodingSystem' },
  { index: 9, name: 'OriginalText' },
];

const hdComponents: ComponentDef[] = [
  { index: 1, name: 'NamespaceId' },
  { index: 2, name: 'UniversalId' },
  { index: 3, name: 'UniversalIdType' },
];

const plComponents: ComponentDef[] = [
  { index: 1, name: 'PointOfCare' },
  { index: 2, name: 'Facility' },
  { index: 3, name: 'Department' },
  { index: 4, name: 'BedStatus' },
  { index: 5, name: 'LocationType' },
  { index: 6, name: 'Building' },
  { index: 7, name: 'Floor' },
];

const xcnComponents: ComponentDef[] = [
  { index: 1, name: 'IdNumber' },
  { index: 2, name: 'FamilyName' },
  { index: 3, name: 'GivenName' },
  { index: 4, name: 'MiddleName' },
  { index: 5, name: 'Suffix' },
  { index: 6, name: 'Prefix' },
  { index: 7, name: 'Degree' },
  { index: 10, name: 'NameTypeCode' },
  { index: 13, name: 'IdentifierTypeCode' },
];

const eiComponents: ComponentDef[] = [
  { index: 1, name: 'EntityIdentifier' },
  { index: 2, name: 'NamespaceId' },
  { index: 3, name: 'UniversalId' },
  { index: 4, name: 'UniversalIdType' },
];

const MSH_FIELDS: FieldDef[] = [
  { index: 1, name: 'FieldSeparator', dataType: 'ST', components: [] },
  { index: 2, name: 'EncodingCharacters', dataType: 'ST', components: [] },
  { index: 3, name: 'SendingApplication', dataType: 'HD', components: hdComponents },
  { index: 4, name: 'SendingFacility', dataType: 'HD', components: hdComponents },
  { index: 5, name: 'ReceivingApplication', dataType: 'HD', components: hdComponents },
  { index: 6, name: 'ReceivingFacility', dataType: 'HD', components: hdComponents },
  { index: 7, name: 'DateTimeOfMessage', dataType: 'DTM', components: [] },
  { index: 8, name: 'Security', dataType: 'ST', components: [] },
  { index: 9, name: 'MessageType', dataType: 'MSG', components: [
    { index: 1, name: 'MessageCode' },
    { index: 2, name: 'TriggerEvent' },
    { index: 3, name: 'MessageStructure' },
  ]},
  { index: 10, name: 'MessageControlId', dataType: 'ST', components: [] },
  { index: 11, name: 'ProcessingId', dataType: 'PT', components: [{ index: 1, name: 'ProcessingMode' }] },
  { index: 12, name: 'VersionId', dataType: 'VID', components: [{ index: 1, name: 'Version' }] },
  { index: 13, name: 'SequenceNumber', dataType: 'NM', components: [] },
  { index: 14, name: 'ContinuationPointer', dataType: 'ST', components: [] },
  { index: 15, name: 'AcceptAcknowledgmentType', dataType: 'ID', components: [] },
  { index: 16, name: 'ApplicationAcknowledgmentType', dataType: 'ID', components: [] },
  { index: 17, name: 'CountryCode', dataType: 'ID', components: [] },
  { index: 18, name: 'CharacterSet', dataType: 'ID', components: [] },
  { index: 19, name: 'PrincipalLanguage', dataType: 'CWE', components: cweComponents },
];

const PID_FIELDS: FieldDef[] = [
  { index: 1, name: 'SetId', dataType: 'SI', components: [] },
  { index: 2, name: 'PatientIdExternal', dataType: 'CX', components: cxComponents },
  { index: 3, name: 'PatientIdentifierList', dataType: 'CX', components: cxComponents },
  { index: 4, name: 'AlternatePatientId', dataType: 'CX', components: cxComponents },
  { index: 5, name: 'PatientName', dataType: 'XPN', components: xpnComponents },
  { index: 6, name: 'MothersMaidenName', dataType: 'XPN', components: xpnComponents },
  { index: 7, name: 'DateTimeOfBirth', dataType: 'DTM', components: [] },
  { index: 8, name: 'AdministrativeSex', dataType: 'CWE', components: cweComponents },
  { index: 9, name: 'PatientAlias', dataType: 'XPN', components: xpnComponents },
  { index: 10, name: 'Race', dataType: 'CWE', components: cweComponents },
  { index: 11, name: 'PatientAddress', dataType: 'XAD', components: xadComponents },
  { index: 12, name: 'CountyCode', dataType: 'IS', components: [] },
  { index: 13, name: 'PhoneNumberHome', dataType: 'XTN', components: xtnComponents },
  { index: 14, name: 'PhoneNumberBusiness', dataType: 'XTN', components: xtnComponents },
  { index: 15, name: 'PrimaryLanguage', dataType: 'CWE', components: cweComponents },
  { index: 16, name: 'MaritalStatus', dataType: 'CWE', components: cweComponents },
  { index: 17, name: 'Religion', dataType: 'CWE', components: cweComponents },
  { index: 18, name: 'PatientAccountNumber', dataType: 'CX', components: cxComponents },
  { index: 19, name: 'SsnNumber', dataType: 'ST', components: [] },
  { index: 20, name: 'DriversLicenseNumber', dataType: 'DLN', components: [] },
  { index: 21, name: 'MothersIdentifier', dataType: 'CX', components: cxComponents },
  { index: 22, name: 'EthnicGroup', dataType: 'CWE', components: cweComponents },
  { index: 23, name: 'BirthPlace', dataType: 'ST', components: [] },
  { index: 24, name: 'MultipleBirthIndicator', dataType: 'ID', components: [] },
  { index: 25, name: 'BirthOrder', dataType: 'NM', components: [] },
  { index: 26, name: 'Citizenship', dataType: 'CWE', components: cweComponents },
  { index: 27, name: 'VeteransMilitaryStatus', dataType: 'CWE', components: cweComponents },
  { index: 28, name: 'Nationality', dataType: 'CWE', components: cweComponents },
  { index: 29, name: 'PatientDeathDateAndTime', dataType: 'DTM', components: [] },
  { index: 30, name: 'PatientDeathIndicator', dataType: 'ID', components: [] },
];

const PV1_FIELDS: FieldDef[] = [
  { index: 1, name: 'SetId', dataType: 'SI', components: [] },
  { index: 2, name: 'PatientClass', dataType: 'CWE', components: cweComponents },
  { index: 3, name: 'AssignedPatientLocation', dataType: 'PL', components: plComponents },
  { index: 4, name: 'AdmissionType', dataType: 'CWE', components: cweComponents },
  { index: 5, name: 'PreadmitNumber', dataType: 'CX', components: cxComponents },
  { index: 6, name: 'PriorPatientLocation', dataType: 'PL', components: plComponents },
  { index: 7, name: 'AttendingDoctor', dataType: 'XCN', components: xcnComponents },
  { index: 8, name: 'ReferringDoctor', dataType: 'XCN', components: xcnComponents },
  { index: 9, name: 'ConsultingDoctor', dataType: 'XCN', components: xcnComponents },
  { index: 10, name: 'HospitalService', dataType: 'CWE', components: cweComponents },
  { index: 11, name: 'TemporaryLocation', dataType: 'PL', components: plComponents },
  { index: 13, name: 'ReadmissionIndicator', dataType: 'CWE', components: cweComponents },
  { index: 14, name: 'AdmitSource', dataType: 'CWE', components: cweComponents },
  { index: 15, name: 'AmbulatoryStatus', dataType: 'CWE', components: cweComponents },
  { index: 16, name: 'VipIndicator', dataType: 'CWE', components: cweComponents },
  { index: 17, name: 'AdmittingDoctor', dataType: 'XCN', components: xcnComponents },
  { index: 18, name: 'PatientType', dataType: 'CWE', components: cweComponents },
  { index: 19, name: 'VisitNumber', dataType: 'CX', components: cxComponents },
  { index: 20, name: 'FinancialClass', dataType: 'FC', components: [] },
  { index: 44, name: 'AdmitDateTime', dataType: 'DTM', components: [] },
];

const OBR_FIELDS: FieldDef[] = [
  { index: 1, name: 'SetId', dataType: 'SI', components: [] },
  { index: 2, name: 'PlacerOrderNumber', dataType: 'EI', components: eiComponents },
  { index: 3, name: 'FillerOrderNumber', dataType: 'EI', components: eiComponents },
  { index: 4, name: 'UniversalServiceIdentifier', dataType: 'CWE', components: cweComponents },
  { index: 7, name: 'ObservationDateTime', dataType: 'DTM', components: [] },
  { index: 8, name: 'ObservationEndDateTime', dataType: 'DTM', components: [] },
  { index: 10, name: 'CollectorIdentifier', dataType: 'XCN', components: xcnComponents },
  { index: 12, name: 'DangerCode', dataType: 'CWE', components: cweComponents },
  { index: 13, name: 'RelevantClinicalInfo', dataType: 'ST', components: [] },
  { index: 14, name: 'SpecimenReceivedDateTime', dataType: 'DTM', components: [] },
  { index: 16, name: 'OrderingProvider', dataType: 'XCN', components: xcnComponents },
  { index: 24, name: 'DiagnosticServSectId', dataType: 'ID', components: [] },
  { index: 25, name: 'ResultStatus', dataType: 'ID', components: [] },
];

const OBX_FIELDS: FieldDef[] = [
  { index: 1, name: 'SetId', dataType: 'SI', components: [] },
  { index: 2, name: 'ValueType', dataType: 'ID', components: [] },
  { index: 3, name: 'ObservationIdentifier', dataType: 'CWE', components: cweComponents },
  { index: 4, name: 'ObservationSubId', dataType: 'ST', components: [] },
  { index: 5, name: 'ObservationValue', dataType: 'ST', components: [] },
  { index: 6, name: 'Units', dataType: 'CWE', components: cweComponents },
  { index: 7, name: 'ReferenceRange', dataType: 'ST', components: [] },
  { index: 8, name: 'AbnormalFlags', dataType: 'CWE', components: cweComponents },
  { index: 9, name: 'Probability', dataType: 'NM', components: [] },
  { index: 11, name: 'ObservationResultStatus', dataType: 'ID', components: [] },
  { index: 12, name: 'EffectiveDateOfReferenceRange', dataType: 'DTM', components: [] },
  { index: 14, name: 'DateTimeOfObservation', dataType: 'DTM', components: [] },
];

const NK1_FIELDS: FieldDef[] = [
  { index: 1, name: 'SetId', dataType: 'SI', components: [] },
  { index: 2, name: 'Name', dataType: 'XPN', components: xpnComponents },
  { index: 3, name: 'Relationship', dataType: 'CWE', components: cweComponents },
  { index: 4, name: 'Address', dataType: 'XAD', components: xadComponents },
  { index: 5, name: 'PhoneNumber', dataType: 'XTN', components: xtnComponents },
  { index: 6, name: 'BusinessPhoneNumber', dataType: 'XTN', components: xtnComponents },
  { index: 7, name: 'ContactRole', dataType: 'CWE', components: cweComponents },
];

const ORC_FIELDS: FieldDef[] = [
  { index: 1, name: 'OrderControl', dataType: 'ID', components: [] },
  { index: 2, name: 'PlacerOrderNumber', dataType: 'EI', components: eiComponents },
  { index: 3, name: 'FillerOrderNumber', dataType: 'EI', components: eiComponents },
  { index: 5, name: 'OrderStatus', dataType: 'ID', components: [] },
  { index: 9, name: 'DateTimeOfTransaction', dataType: 'DTM', components: [] },
  { index: 10, name: 'EnteredBy', dataType: 'XCN', components: xcnComponents },
  { index: 11, name: 'VerifiedBy', dataType: 'XCN', components: xcnComponents },
  { index: 12, name: 'OrderingProvider', dataType: 'XCN', components: xcnComponents },
  { index: 14, name: 'CallbackPhoneNumber', dataType: 'XTN', components: xtnComponents },
  { index: 15, name: 'OrderEffectiveDateTime', dataType: 'DTM', components: [] },
];

export const HL7_SEGMENTS: Record<string, SegmentDef> = {
  MSH: { code: 'MSH', name: 'MessageHeader', fields: MSH_FIELDS },
  PID: { code: 'PID', name: 'PatientIdentification', fields: PID_FIELDS },
  PV1: { code: 'PV1', name: 'PatientVisit', fields: PV1_FIELDS },
  OBR: { code: 'OBR', name: 'ObservationRequest', fields: OBR_FIELDS },
  OBX: { code: 'OBX', name: 'ObservationResult', fields: OBX_FIELDS },
  NK1: { code: 'NK1', name: 'NextOfKin', fields: NK1_FIELDS },
  ORC: { code: 'ORC', name: 'CommonOrder', fields: ORC_FIELDS },
};

export function getFieldName(segment: string, fieldIndex: number): string | null {
  const segDef = HL7_SEGMENTS[segment];
  if (!segDef) return null;
  const field = segDef.fields.find(f => f.index === fieldIndex);
  return field?.name ?? null;
}

export function getComponentName(segment: string, fieldIndex: number, compIndex: number): string | null {
  const segDef = HL7_SEGMENTS[segment];
  if (!segDef) return null;
  const field = segDef.fields.find(f => f.index === fieldIndex);
  if (!field) return null;
  const comp = field.components.find(c => c.index === compIndex);
  return comp?.name ?? null;
}

function camelToSnake(name: string): string {
  return name.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

export function resolveColumnName(segment: string, fieldIndex: number, compIndex?: number): string {
  const segPrefix = segment.toLowerCase();
  const fieldName = getFieldName(segment, fieldIndex);
  if (!fieldName) {
    const base = `${segPrefix}_${fieldIndex}`;
    return compIndex ? `${base}_${compIndex}` : base;
  }
  const fieldPart = camelToSnake(fieldName);
  if (!compIndex) return `${segPrefix}_${fieldPart}`;
  const compName = getComponentName(segment, fieldIndex, compIndex);
  if (!compName) return `${segPrefix}_${fieldPart}_${compIndex}`;
  const compPart = camelToSnake(compName);
  return `${segPrefix}_${fieldPart}_${compPart}`;
}
