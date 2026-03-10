import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_TEAM_MEMBERS } from '../../graphql/queries';
import { INVITE_TEAM_MEMBER, REMOVE_TEAM_MEMBER, UPDATE_TEAM_MEMBER_ROLE } from '../../graphql/mutations';
import LoadingSpinner from '../common/LoadingSpinner';

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  lastActiveAt: string | null;
  createdAt: string;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'Full access. Can manage team members, settings, and all resources.',
  editor: 'Can create and edit alerts, incidents, and notification channels.',
  viewer: 'Read-only access to dashboards, alerts, and incidents.',
};

const TeamSettings: React.FC = () => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const { data, loading, refetch } = useQuery<{ teamMembers: TeamMember[] }>(GET_TEAM_MEMBERS);

  const [inviteMember, { loading: inviting }] = useMutation(INVITE_TEAM_MEMBER, {
    onCompleted: () => {
      setInviteEmail('');
      setInviteSuccess('Invitation sent successfully');
      setInviteError('');
      setTimeout(() => setInviteSuccess(''), 3000);
      refetch();
    },
    onError: (err) => {
      setInviteError(err.message);
      setInviteSuccess('');
    },
  });

  const [removeMember] = useMutation(REMOVE_TEAM_MEMBER, {
    onCompleted: () => refetch(),
  });

  const [updateRole] = useMutation(UPDATE_TEAM_MEMBER_ROLE, {
    onCompleted: () => refetch(),
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Invalid email address');
      return;
    }

    await inviteMember({
      variables: { email: inviteEmail.trim(), role: inviteRole },
    });
  };

  const handleRemove = async (member: TeamMember) => {
    if (!window.confirm(`Remove ${member.name || member.email} from the team?`)) return;
    await removeMember({ variables: { memberId: member.id } });
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    await updateRole({ variables: { memberId, role: newRole } });
  };

  const formatLastActive = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) return <LoadingSpinner />;

  const members = data?.teamMembers || [];

  return (
    <div className="team-settings">
      <h2>Team Management</h2>

      <section className="settings-section">
        <h3>Invite Member</h3>
        <form className="invite-form" onSubmit={handleInvite}>
          <div className="form-row">
            <div className="form-group form-group--grow">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                placeholder="colleague@company.com"
                className={inviteError ? 'input-error' : ''}
              />
            </div>
            <div className="form-group">
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={inviting}>
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
          {inviteError && <span className="field-error">{inviteError}</span>}
          {inviteSuccess && <span className="save-indicator">{inviteSuccess}</span>}
        </form>
      </section>

      <section className="settings-section">
        <h3>Team Members ({members.length})</h3>
        <div className="team-table-container">
          <table className="team-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.name || '--'}</td>
                  <td>{member.email}</td>
                  <td>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </td>
                  <td>{formatLastActive(member.lastActiveAt)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-small btn-danger-text"
                      onClick={() => handleRemove(member)}
                      disabled={member.role === 'admin'}
                      title={member.role === 'admin' ? 'Cannot remove admin' : 'Remove member'}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-section">
        <h3>Role Permissions</h3>
        <div className="role-cards">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
            <div key={role} className="role-card">
              <h4>{role.charAt(0).toUpperCase() + role.slice(1)}</h4>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TeamSettings;
