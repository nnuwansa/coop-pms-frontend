"use client";

import React from 'react';

interface LetterFormatProps {
    letterData: any;
    _ref?: React.RefObject<HTMLDivElement>;
}

const LetterFormat = ({_ref, letterData}: LetterFormatProps) => {
    if (!letterData) return null;

    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
    };

    const styles = {
        container: {
            maxWidth: '21cm',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            padding: '3rem',
            minHeight: '29.7cm',
            fontFamily: 'Arial, sans-serif',
            color: '#000000',
            lineHeight: '1.5'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid #000'
        },
        headerLogo: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        },
        orgName: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            padding: '0'
        },
        addressLine: {
            color: '#333',
            margin: '0',
            padding: '0'
        },
        headerInfo: {},
        reference: {
            fontWeight: '600',
            margin: '0',
            padding: '0'
        },
        correspondentInfo: {
            marginTop: '1rem',
            borderTop: '1px dashed #888',
            paddingTop: '1rem',
        },
        subject: {
            marginBottom: '1.5rem'
        },
        contentBlock: {
            marginTop: '1.5rem',
            marginBottom: '1.5rem'
        },
        preLineText: {
            whiteSpace: 'pre-line',
            textAlign: 'justify' as const
        },
        other: {
            whiteSpace: 'pre-line',
            textAlign: 'justify' as const,
            borderTop: '1px dashed #888',
            marginTop: '1rem',
            paddingTop: '1rem',
        },
        footer: {
            marginTop: '3rem'
        },
        fontBold: {
            fontWeight: '600',
            margin: '0',
            padding: '0'
        },
        signature: {
            margin: '0',
            padding: '0'
        },
        paragraph: {
            margin: '0',
            padding: '0',
            marginBottom: '0.5rem'
        },
        remarksSection: {
            marginTop: '2rem',
            borderTop: '1px solid #000',
            paddingTop: '1.5rem'
        },
        remarkItem: {
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px dashed #888'
        },
        remarkField: {
            marginBottom: '0.3rem',
            textAlign: 'justify' as const
        }
    };


    return (
        <div ref={_ref} style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerLogo}>
                    <div>
                        <h1 style={styles.orgName}>Department of Co-operative Development</h1>
                        <p style={styles.addressLine}>P.O Box 02, Ehelepola Kumarihami Mawatha,</p>
                        <p style={styles.addressLine}>Bogambara, Kandy</p>
                    </div>
                </div>
                <div style={styles.headerInfo}>
                    <p style={styles.reference}>Reference: {letterData.code}</p>
                    <p style={styles.paragraph}>Date: {formatDate(letterData.received_datetime)}</p>
                </div>
            </div>

            {/* Letter Content */}
            <div>
                {/* Subject */}
                <div style={styles.subject}>
                    <p style={styles.fontBold}>Subject: {letterData.subject}</p>
                </div>

                {/* Content */}
                <div style={styles.contentBlock}>
                    {letterData.content && (
                        <div style={styles.preLineText}>{letterData.content}</div>
                    )}

                    {letterData.other && (
                        <div style={styles.other}>{letterData.other}</div>
                    )}
                </div>

                {/* Recipient Info */}
                <div style={styles.correspondentInfo}>
                    <p style={styles.fontBold}>Correspondent Information</p>
                    <p style={styles.fontBold}>{letterData.sender}</p>
                    <p style={styles.signature}>{letterData.organization?.name}</p>
                    {letterData.email && <p style={styles.signature}>{letterData.email}</p>}
                    {letterData.telephone && <p style={styles.paragraph}>{letterData.telephone}</p>}
                </div>

                {/* Remarks Section */}
                {letterData.remarks && letterData.remarks.length > 0 && (
                    <div style={styles.remarksSection}>
                        <h2 style={{...styles.fontBold, fontSize: '1.1rem', marginBottom: '1rem'}}>Remarks</h2>
                        {letterData.remarks.slice().reverse().map((remark: any) => (
                            <div key={remark.id} style={styles.remarkItem}>
                                <p style={styles.remarkField}>
                                    <strong>Date:</strong> {formatDate(remark.create_datetime)}</p>
                                <p style={styles.remarkField}><strong>Content:</strong> {remark.content}</p>
                                {remark.department && (
                                    <p style={styles.remarkField}><strong>Department:</strong> {remark.department}</p>
                                )}
                                {remark.assignee && (
                                    <p style={styles.remarkField}><strong>Assignee:</strong> {remark.assignee}</p>
                                )}
                                {remark.status && (
                                    <p style={styles.remarkField}><strong>Status:</strong> {remark.status}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LetterFormat;